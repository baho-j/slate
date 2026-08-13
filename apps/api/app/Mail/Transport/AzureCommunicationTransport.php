<?php

namespace App\Mail\Transport;

use Illuminate\Support\Facades\Http;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\MessageConverter;

class AzureCommunicationTransport extends AbstractTransport
{
    private const API_VERSION = '2023-03-31';

    public function __construct(
        private readonly string $endpoint,
        private readonly string $accessKey,
    ) {
        parent::__construct();
    }

    public function __toString(): string
    {
        return 'azure+acs://'.parse_url($this->endpoint, PHP_URL_HOST);
    }

    protected function doSend(SentMessage $message): void
    {
        $email = MessageConverter::toEmail($message->getOriginalMessage());

        $path = '/emails:send?api-version='.self::API_VERSION;
        $url = rtrim($this->endpoint, '/').$path;
        $encoded = json_encode($this->payload($email), JSON_THROW_ON_ERROR);

        $response = Http::withHeaders($this->signedHeaders('POST', $path, $encoded))
            ->withBody($encoded, 'application/json')
            ->post($url);

        $response->throw();
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Email $email): array
    {
        $from = $email->getFrom()[0] ?? throw new \RuntimeException('An ACS email requires a From address.');

        return [
            'senderAddress' => $from->getAddress(),
            'content' => [
                'subject' => $email->getSubject() ?? '',
                'plainText' => $email->getTextBody(),
                'html' => $email->getHtmlBody(),
            ],
            'recipients' => [
                'to' => $this->addresses($email->getTo()),
                'cc' => $this->addresses($email->getCc()),
                'bcc' => $this->addresses($email->getBcc()),
            ],
            'replyTo' => $this->addresses($email->getReplyTo()),
        ];
    }

    /**
     * @param  array<int, Address>  $addresses
     * @return array<int, array<string, string>>
     */
    private function addresses(array $addresses): array
    {
        return array_map(fn (Address $address) => [
            'address' => $address->getAddress(),
            'displayName' => $address->getName(),
        ], $addresses);
    }

    /**
     * ACS authenticates each request with an HMAC-SHA256 signature over the
     * verb, path, date, host and a SHA-256 hash of the body (docs.microsoft.com
     * → Communication Services "Sign an HTTP request").
     *
     * @return array<string, string>
     */
    private function signedHeaders(string $verb, string $path, string $body): array
    {
        $host = parse_url($this->endpoint, PHP_URL_HOST);
        $date = gmdate('D, d M Y H:i:s \G\M\T');
        $contentHash = base64_encode(hash('sha256', $body, true));

        $stringToSign = "{$verb}\n{$path}\n{$date};{$host};{$contentHash}";
        $signature = base64_encode(
            hash_hmac('sha256', $stringToSign, base64_decode($this->accessKey), true)
        );

        return [
            'x-ms-date' => $date,
            'x-ms-content-sha256' => $contentHash,
            'Authorization' => "HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature={$signature}",
        ];
    }
}
